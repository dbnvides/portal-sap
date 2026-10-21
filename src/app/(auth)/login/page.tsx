import { Suspense } from "react";
import { Boxes, HandCoins, Package, ShoppingCart, Users } from "lucide-react";
import { LoginForm } from "./login-form";

const BRAND = process.env.CLIENT_NAME ?? "Portal SAP";

const features = [
  { icon: Package, text: "Itens e estoque por depósito" },
  { icon: Users, text: "Clientes, fornecedores e leads" },
  { icon: ShoppingCart, text: "Cotações, pedidos, entregas e notas" },
  { icon: HandCoins, text: "Contas a receber e recebimentos" },
];

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel da marca: cores vêm do tema do cliente. Some em telas pequenas. */}
      <aside className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -right-24 -top-24 size-96 rounded-full bg-primary/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -left-16 size-96 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <Logo />
          <span className="text-lg font-semibold text-sidebar-active-foreground">{BRAND}</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight text-sidebar-active-foreground">
            Sua operação SAP Business One em um só lugar.
          </h2>
          <ul className="mt-8 space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-theme bg-white/10">
                  <Icon size={18} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs opacity-60">Integrado ao SAP Business One Service Layer</p>
      </aside>

      <main className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo />
            <span className="text-lg font-semibold">{BRAND}</span>
          </div>
          <h1 className="text-2xl font-semibold">Bem-vindo de volta</h1>
          <p className="mb-8 mt-1 text-sm text-muted">Entre com seu e-mail e senha para continuar.</p>
          {/* Form só aparece com o ?next= já lido; antes disso, skeleton (evita login sem o redirect). */}
          <Suspense fallback={<FormFallback />}>
            <NextParam searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

function FormFallback() {
  return (
    <div className="space-y-5" aria-busy="true">
      {[0, 1].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded bg-border" />
          <div className="h-10 animate-pulse rounded-theme bg-border" />
        </div>
      ))}
      <div className="h-10 animate-pulse rounded-theme bg-border" />
    </div>
  );
}

function Logo() {
  return (
    <span className="flex size-10 items-center justify-center rounded-theme bg-primary text-primary-foreground">
      <Boxes size={22} />
    </span>
  );
}

// `searchParams` é dado da requisição: fica dentro de <Suspense> (Cache Components).
async function NextParam({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}
