import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PageTransition>
    <div className="flex min-h-screen items-center justify-center"
         style={{ background: 'hsl(222 47% 8%)' }}>
      <div className="text-center">
        <h1 className="mb-4 text-5xl font-extrabold tracking-wider text-white">404</h1>
        <p className="mb-4 text-lg text-white/40">Página não encontrada</p>
        <a href="/" className="text-sm font-medium text-blue-400 hover:text-blue-300 underline underline-offset-4">
          Voltar ao início
        </a>
      </div>
    </div>
    </PageTransition>
  );
};

export default NotFound;
