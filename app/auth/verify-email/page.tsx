export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Verifique seu Email
          </h1>
          <p className="text-muted-foreground">
            Enviamos um link de confirmação para seu email. Clique no link para ativar sua conta e começar a usar o
            WORKSPACE E+I.
          </p>
          <p className="text-sm text-muted-foreground">Não recebeu o email? Verifique sua caixa de spam.</p>
        </div>
      </div>
    </div>
  )
}
