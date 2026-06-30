import { Button } from '@/components/ui/button';

export function HomePage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight lg:text-6xl">Welcome to Weapply</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          AI-powered scholarship and university matching platform
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button size="lg">Get Started</Button>
          <Button size="lg" variant="outline">
            Learn More
          </Button>
        </div>
      </div>
    </div>
  );
}
