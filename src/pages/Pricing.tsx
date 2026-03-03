import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { TIER_LIST, getTierByProductId } from "@/lib/stripe-tiers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Crown,
  Loader2,
  Sparkles,
  Star,
  ExternalLink,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";

export default function Pricing() {
  const { user, role, subscription, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const currentTier = subscription.productId
    ? getTierByProductId(subscription.productId)
    : null;

  // Handle success/cancel params
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Assinatura realizada com sucesso! Atualizando...");
      refreshSubscription();
    }
    if (searchParams.get("canceled") === "true") {
      toast.info("Checkout cancelado.");
    }
  }, [searchParams, refreshSubscription]);

  const handleCheckout = async (priceId: string) => {
    if (!user) {
      navigate("/login");
      return;
    }
    setCheckoutLoading(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error("Erro ao iniciar checkout. Tente novamente.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      console.error("Portal error:", err);
      toast.error("Erro ao abrir portal de gerenciamento.");
    } finally {
      setPortalLoading(false);
    }
  };

  const tierIcons = [Star, Crown, Zap];

  return (
    <Layout>
      <div className="space-y-8 max-w-4xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() =>
              navigate(role === "trainer" ? "/trainer" : role === "student" ? "/student" : "/")
            }
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Planos</h1>
            <p className="text-sm text-muted-foreground">
              Escolha o plano ideal para o seu negócio
            </p>
          </div>
        </div>

        {/* Current plan banner */}
        {subscription.subscribed && currentTier && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Plano atual: <span className="text-primary">{currentTier.name}</span>
                </p>
                {subscription.subscriptionEnd && (
                  <p className="text-xs text-muted-foreground">
                    Renova em{" "}
                    {new Date(subscription.subscriptionEnd).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="gap-1.5"
            >
              {portalLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Gerenciar
            </Button>
          </motion.div>
        )}

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIER_LIST.map((tier, i) => {
            const isCurrentPlan =
              subscription.subscribed && currentTier?.key === tier.key;
            const TierIcon = tierIcons[i];

            return (
              <motion.div
                key={tier.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl border p-6 flex flex-col gap-5 transition-all ${
                  tier.highlighted
                    ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/5"
                    : "border-border bg-card/40"
                } ${isCurrentPlan ? "ring-2 ring-primary/40" : ""}`}
              >
                {/* Highlight badge */}
                {tier.highlighted && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 shadow-md">
                      RECOMENDADO
                    </Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-accent text-accent-foreground text-[10px] font-bold px-3 py-0.5 shadow-md">
                      SEU PLANO
                    </Badge>
                  </div>
                )}

                {/* Icon + Name */}
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      tier.highlighted
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <TierIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
                    <p className="text-xs text-muted-foreground">{tier.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">
                    R${tier.price.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  className={`w-full ${
                    tier.highlighted && !isCurrentPlan
                      ? "bg-primary hover:bg-primary/90"
                      : ""
                  }`}
                  variant={isCurrentPlan ? "outline" : tier.highlighted ? "default" : "secondary"}
                  disabled={isCurrentPlan || checkoutLoading === tier.price_id}
                  onClick={() =>
                    isCurrentPlan
                      ? handleManageSubscription()
                      : handleCheckout(tier.price_id)
                  }
                >
                  {checkoutLoading === tier.price_id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {isCurrentPlan
                    ? "Plano Atual"
                    : subscription.subscribed
                    ? "Trocar Plano"
                    : "Assinar"}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Manage button (if subscribed but no current tier banner fallback) */}
        {subscription.subscribed && (
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="gap-1.5 text-muted-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Gerenciar assinatura no portal
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
