import React from 'react';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

export const AdminPlaceholderPage: React.FC = () => {
  return (
    <div className="py-24 bg-canvas-pearl min-h-[70vh] flex items-center justify-center">
      <Container size="sm">
        <Card className="p-8 sm:p-10 border-stroke-ice shadow-card text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Admin Portal Security Gate
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
              The Administrative CMS is strictly disabled in Prompt 05. In accordance with zero-trust governance, no insecure bypasses or unauthenticated dashboards are accessible.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <ShieldAlert className="w-4 h-4 text-brand-primary" />
              <span>Roadmap Milestone Schedule:</span>
            </div>
            <p>• <strong>Prompt 06:</strong> Cloudflare R2 Persistent Content Storage & Mutation APIs</p>
            <p>• <strong>Prompt 07:</strong> Secure Web Crypto PBKDF2/HMAC Session Authentication</p>
            <p>• <strong>Prompt 08–12:</strong> Dedicated CMS Modules for Profile, Projects, Skills & AI Services</p>
          </div>

          <div>
            <Button variant="primary" as="a" href="/" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return to Public Portfolio
            </Button>
          </div>
        </Card>
      </Container>
    </div>
  );
};
