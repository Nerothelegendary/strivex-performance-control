export interface SubscriptionTier {
  key: string;
  name: string;
  price_id: string;
  product_id: string;
  price: number; // in BRL
  student_limit: number | null; // null = unlimited
  description: string;
  features: string[];
  highlighted?: boolean;
}

export const TIERS: Record<string, SubscriptionTier> = {
  basic: {
    key: "basic",
    name: "Basic",
    price_id: "price_1T72EcPGoZ8jcg99srj2hITb",
    product_id: "prod_U5CdAkwPQt0mwe",
    price: 49.9,
    student_limit: 10,
    description: "Ideal para personal trainers iniciantes.",
    features: [
      "Até 10 alunos",
      "Templates de treino",
      "Acompanhamento de progresso",
      "Convites por link",
    ],
  },
  pro: {
    key: "pro",
    name: "Pro",
    price_id: "price_1T72I3PGoZ8jcg99H7NV8Qnp",
    product_id: "prod_U5ChiHccT7UCKc",
    price: 89.9,
    student_limit: 30,
    description: "Para personal trainers em crescimento.",
    features: [
      "Até 30 alunos",
      "Templates de treino",
      "Acompanhamento de progresso",
      "Convites por link",
      "Notas por aluno",
      "Feed de atividades",
    ],
    highlighted: true,
  },
  elite: {
    key: "elite",
    name: "Elite",
    price_id: "price_1T72K2PGoZ8jcg999erOqEzy",
    product_id: "prod_U5CjozBMPvitL9",
    price: 149.9,
    student_limit: null,
    description: "Para academias e treinadores de alto volume.",
    features: [
      "Alunos ilimitados",
      "Templates de treino",
      "Acompanhamento de progresso",
      "Convites por link",
      "Notas por aluno",
      "Feed de atividades",
      "Suporte prioritário",
    ],
  },
};

export const TIER_LIST = Object.values(TIERS);

export function getTierByProductId(productId: string): SubscriptionTier | undefined {
  return TIER_LIST.find((t) => t.product_id === productId);
}

export function getTierByPriceId(priceId: string): SubscriptionTier | undefined {
  return TIER_LIST.find((t) => t.price_id === priceId);
}
