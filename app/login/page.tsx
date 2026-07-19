import Image from 'next/image';
import { LoginForm } from '@/components/login-form';
import { logger } from '@/lib/logger.server';

const log = logger.child({ module: 'app/login/page' });

export default function LoginPage() {
  log.debug('Rendering custom login page', {
    userId: 'signed_out',
    action: 'render_login',
  });

  return (
    <div className="bg-muted flex h-screen flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <Image src="/deft-logo.png" alt="Deft" width={24} height={24} className="rounded-md" />
          Deft
        </a>
        <LoginForm />
      </div>
    </div>
  );
}
