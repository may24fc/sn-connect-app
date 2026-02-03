'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Building2, Users, Shield, TrendingUp } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Badge,
} from '@hr-portal/ui';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage(): ReactNode {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      // Router navigation is handled by the auth context
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (testEmail: string): Promise<void> => {
    setEmail(testEmail);
    setPassword('password');
    setError('');
    setIsLoading(true);

    try {
      await login(testEmail, 'password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Building2,
      title: 'Centralized HR Hub',
      description: 'All your HR needs in one place',
    },
    {
      icon: Users,
      title: 'Employee Self-Service',
      description: 'Manage your profile and documents',
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description: 'Enterprise-grade data protection',
    },
    {
      icon: TrendingUp,
      title: 'AI-Powered Insights',
      description: 'Smart recommendations and analytics',
    },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-sidebar via-sidebar-hover to-primary-900 p-12 text-white">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm font-bold text-xl">
              SN
            </div>
            <span className="text-2xl font-bold">HR Portal</span>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight">
              Welcome to your
              <br />
              <span className="text-primary-300">HR Command Center</span>
            </h1>
            <p className="mt-4 text-lg text-white/70">
              Streamline your HR operations with our intelligent portal.
              From onboarding to payroll, we have got you covered.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl bg-white/5 backdrop-blur-sm p-4 transition-colors hover:bg-white/10"
              >
                <feature.icon className="h-8 w-8 text-primary-300" />
                <h3 className="mt-3 font-semibold">{feature.title}</h3>
                <p className="mt-1 text-sm text-white/60">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-white/50">
          &copy; {new Date().getFullYear()} SNHR Portal. All rights reserved.
        </p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-none lg:shadow-card">
          <CardHeader className="space-y-1 text-center">
            {/* Mobile Logo */}
            <div className="mb-4 flex items-center justify-center gap-2 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
                SN
              </div>
              <span className="text-xl font-bold">HR Portal</span>
            </div>

            <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setRememberMe(checked === true)
                  }
                />
                <Label htmlFor="remember" className="text-sm font-normal">
                  Remember me for 30 days
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            {/* Quick Login for Testing */}
            <div className="mt-6 border-t pt-6">
              <p className="mb-3 text-center text-sm font-medium text-muted-foreground">
                Quick Test Login
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin('employee@test.com')}
                  disabled={isLoading}
                >
                  <Badge variant="secondary" className="mr-2">
                    Employee
                  </Badge>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin('intern@test.com')}
                  disabled={isLoading}
                >
                  <Badge variant="secondary" className="mr-2">
                    Intern
                  </Badge>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin('admin@test.com')}
                  disabled={isLoading}
                >
                  <Badge variant="secondary" className="mr-2">
                    Admin
                  </Badge>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin('superadmin@test.com')}
                  disabled={isLoading}
                >
                  <Badge variant="secondary" className="mr-2">
                    Super Admin
                  </Badge>
                </Button>
              </div>
            </div>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>
                Need help?{' '}
                <a href="mailto:support@company.com" className="text-primary hover:underline">
                  Contact IT Support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
