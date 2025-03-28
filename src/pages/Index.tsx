
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const Index: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <section className="bg-gradient-to-b from-white to-gray-50 py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="space-y-4">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                  Introducing TeachSync
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter">
                  Synchronize Learning Between Teachers and Students
                </h1>
                <p className="text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Create interactive lessons, engage students in real-time, and track progress with our comprehensive teaching platform.
                </p>
                <div className="flex flex-col md:flex-row gap-3">
                  {user ? (
                    <Button asChild size="lg">
                      <Link to={user.role === 'teacher' ? '/dashboard' : '/student'}>
                        Go to {user.role === 'teacher' ? 'Dashboard' : 'Classroom'}
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild size="lg">
                        <Link to="/register">Get Started</Link>
                      </Button>
                      <Button asChild size="lg" variant="outline">
                        <Link to="/login">Sign In</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="mx-auto lg:ml-auto">
                <div className="aspect-video overflow-hidden rounded-xl border bg-background shadow-xl">
                  <img
                    src="https://placehold.co/800x450?text=TeachSync+Demo"
                    alt="TeachSync Application Demo"
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-[58rem] text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Key Features
              </h2>
              <p className="mt-4 text-muted-foreground md:text-xl">
                Everything you need to create engaging interactive lessons
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 lg:gap-12 mt-12">
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center rounded-md bg-primary/10 p-2 text-primary">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                  >
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Interactive Lessons</h3>
                <p className="text-muted-foreground">
                  Create engaging lessons with text, images, questions, and interactive graphs.
                </p>
              </div>
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center rounded-md bg-primary/10 p-2 text-primary">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                  >
                    <path d="M21 11.5v2.8a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 14.3v-2.8a9 9 0 0 1 18 0Z" />
                    <path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Real-time Sync</h3>
                <p className="text-muted-foreground">
                  Control student navigation and see responses in real-time as they happen.
                </p>
              </div>
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center rounded-md bg-primary/10 p-2 text-primary">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Student Progress</h3>
                <p className="text-muted-foreground">
                  Track student interactions and responses with detailed analytics.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-24 lg:py-32 bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-[58rem] text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Ready to Transform Your Classroom?
              </h2>
              <p className="mt-4 text-muted-foreground md:text-xl">
                Join TeachSync today and discover a new way to connect with your students.
              </p>
              <div className="mt-8">
                {user ? (
                  <Button asChild size="lg">
                    <Link to={user.role === 'teacher' ? '/dashboard' : '/student'}>
                      Go to {user.role === 'teacher' ? 'Dashboard' : 'Classroom'}
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg">
                    <Link to="/register">Get Started Today</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="border-t py-6 md:py-8">
        <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            © {new Date().getFullYear()} TeachSync. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
