import React from 'react';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ArrowLeft, Compass } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="py-24 bg-canvas-pearl min-h-[70vh] flex items-center justify-center">
      <Container size="sm">
        <Card className="p-8 sm:p-10 border-stroke-subtle shadow-card text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-brand-primary flex items-center justify-center">
            <Compass className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900">404 — Page Not Found</h1>
            <p className="text-slate-600 text-sm max-w-sm mx-auto">
              The requested URL does not exist or has been relocated within the portfolio application.
            </p>
          </div>

          <div>
            <Button variant="primary" as="a" href="/" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return to Homepage
            </Button>
          </div>
        </Card>
      </Container>
    </div>
  );
};
