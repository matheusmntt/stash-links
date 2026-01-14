import { LinksList } from "@/components/links-list"
import { getLinks, getAllTags } from "@/lib/actions"

export default async function Home() {
  const [initialLinks, initialTags] = await Promise.all([getLinks(), getAllTags()])

  return (
    <main className="min-h-screen">
      <div className="flex min-h-screen">
        {/* Sidebar com título */}
        <aside className="hidden lg:flex lg:w-80 flex-col justify-between p-10 border-r border-border fixed h-screen">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Stash</h1>
            <p className="text-primary font-medium">Link Manager</p>
            <p className="text-muted-foreground text-sm mt-6 leading-relaxed">
              Salve e organize seus links favoritos em um só lugar.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Feito com Next.js</p>
        </aside>

        {/* Conteúdo principal */}
        <div className="flex-1 lg:ml-80">
          <div className="max-w-3xl mx-auto px-6 py-10 lg:py-16">
            {/* Header mobile */}
            <header className="lg:hidden mb-10">
              <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">Stash</h1>
              <p className="text-primary font-medium text-sm">Link Manager</p>
            </header>

            <LinksList initialLinks={initialLinks} initialTags={initialTags} />
          </div>
        </div>
      </div>
    </main>
  )
}
