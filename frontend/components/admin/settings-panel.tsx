'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiRequest } from '@/lib/api';
import {
  AI_MODELS,
  isAiResponse,
  isCloudflareResponse,
  isConnectionTestResult,
  isPaymentResponse,
  isSmtpResponse,
  type AiProvider,
  type AiView,
  type CloudflareView,
  type PaymentProvider,
  type PaymentView,
  type SettingsTab,
  type SmtpView,
} from '@/lib/admin-settings';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'smtp', label: 'SMTP / Email' },
  { id: 'ai', label: 'AI' },
  { id: 'cloudflare', label: 'Cloudflare Stream' },
  { id: 'payment', label: 'Payment & QRIS' },
];

interface Toast {
  tone: 'success' | 'error';
  text: string;
}

const fieldClass = 'h-11';

export function SettingsPanel() {
  const [tab, setTab] = useState<SettingsTab>('smtp');
  const [toast, setToast] = useState<Toast | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [smtp, setSmtp] = useState<SmtpView>({ host: '', port: 587, username: '', fromEmail: '', passwordConfigured: false });
  const [smtpPassword, setSmtpPassword] = useState('');
  const [ai, setAi] = useState<AiView>({ provider: 'openai', model: 'gpt-4o-mini', apiKeyConfigured: false });
  const [aiKey, setAiKey] = useState('');
  const [cloudflare, setCloudflare] = useState<CloudflareView>({ accountId: '', apiTokenConfigured: false });
  const [cloudflareToken, setCloudflareToken] = useState('');
  const [payment, setPayment] = useState<PaymentView>({
    provider: 'midtrans',
    production: false,
    qris: true,
    virtualAccount: true,
    creditCard: true,
    serverKeyConfigured: false,
  });
  const [serverKey, setServerKey] = useState('');

  useEffect(() => {
    let active = true;
    void Promise.all([
      apiRequest<unknown>('/admin/settings/smtp'),
      apiRequest<unknown>('/admin/settings/ai'),
      apiRequest<unknown>('/admin/settings/cloudflare'),
      apiRequest<unknown>('/admin/settings/payment'),
    ])
      .then(([smtpBody, aiBody, cloudflareBody, paymentBody]) => {
        if (!active) {
          return;
        }
        if (isSmtpResponse(smtpBody)) {
          setSmtp(normalizeSmtp(smtpBody.smtp));
        }
        if (isAiResponse(aiBody)) {
          setAi(normalizeAi(aiBody.ai));
        }
        if (isCloudflareResponse(cloudflareBody)) {
          setCloudflare(normalizeCloudflare(cloudflareBody.cloudflare));
        }
        if (isPaymentResponse(paymentBody)) {
          setPayment(normalizePayment(paymentBody.payment));
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setLoadError(caught instanceof ApiError ? caught.message : 'Could not load settings.');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function notify(tone: Toast['tone'], text: string) {
    setToast({ tone, text });
  }

  async function run(id: string, action: () => Promise<string>) {
    setPending(id);
    try {
      notify('success', await action());
    } catch (caught) {
      notify('error', caught instanceof ApiError ? caught.message : 'The request failed.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Secrets stay on the server. Leave a saved secret blank to keep it.</p>
      </div>
      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Settings">
        {TABS.map((item) => (
          <Button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            variant={tab === item.id ? 'default' : 'outline'}
            className="min-h-11"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {tab === 'smtp' ? (
        <SettingsCard title="SMTP / Email" description="Host, port, mailbox credentials, and the From address.">
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run('smtp-save', () => saveSmtp(smtp, smtpPassword).then((next) => {
                setSmtp(next);
                setSmtpPassword('');
                return 'SMTP settings saved.';
              }));
            }}
          >
            <Field label="Host" id="smtp-host">
              <Input id="smtp-host" className={fieldClass} value={smtp.host} onChange={(event) => setSmtp({ ...smtp, host: event.target.value })} required />
            </Field>
            <Field label="Port" id="smtp-port">
              <Input id="smtp-port" className={fieldClass} inputMode="numeric" value={String(smtp.port)} onChange={(event) => setSmtp({ ...smtp, port: Number(event.target.value) || 0 })} required />
            </Field>
            <Field label="Username" id="smtp-username">
              <Input id="smtp-username" className={fieldClass} value={smtp.username} onChange={(event) => setSmtp({ ...smtp, username: event.target.value })} required />
            </Field>
            <Field label="Password" id="smtp-password" hint={smtp.passwordConfigured ? 'A password is already saved.' : undefined}>
              <Input id="smtp-password" className={fieldClass} type="password" autoComplete="new-password" value={smtpPassword} placeholder={smtp.passwordConfigured ? '••••••••' : ''} onChange={(event) => setSmtpPassword(event.target.value)} />
            </Field>
            <Field label="From email" id="smtp-from">
              <Input id="smtp-from" className={fieldClass} type="email" value={smtp.fromEmail} onChange={(event) => setSmtp({ ...smtp, fromEmail: event.target.value })} required />
            </Field>
            <Actions
              pending={pending}
              testId="smtp-test"
              saveId="smtp-save"
              onTest={() => {
                void run('smtp-test', async () => {
                  const result = await apiRequest<unknown>('/admin/settings/test-smtp', {
                    method: 'POST',
                    body: JSON.stringify({
                      host: smtp.host,
                      port: smtp.port,
                      username: smtp.username,
                      password: smtpPassword,
                      fromEmail: smtp.fromEmail,
                    }),
                  });
                  if (!isConnectionTestResult(result)) {
                    throw new ApiError('The SMTP test returned an unexpected response.', 500);
                  }
                  return result.detail;
                });
              }}
            />
          </form>
        </SettingsCard>
      ) : null}

      {tab === 'ai' ? (
        <SettingsCard title="AI integration" description="Choose a provider, model, and API key.">
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run('ai-save', () => saveAi(ai, aiKey).then((next) => {
                setAi(next);
                setAiKey('');
                return 'AI settings saved.';
              }));
            }}
          >
            <Field label="Provider" id="ai-provider">
              <Select
                id="ai-provider"
                value={ai.provider}
                onChange={(value) => {
                  const provider: AiProvider = value === 'anthropic' ? 'anthropic' : 'openai';
                  const model = AI_MODELS[provider].some((item) => item.id === ai.model) ? ai.model : AI_MODELS[provider][0].id;
                  setAi({ ...ai, provider, model });
                }}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </Select>
            </Field>
            <Field label="Model" id="ai-model">
              <Select id="ai-model" value={ai.model} onChange={(value) => setAi({ ...ai, model: value })}>
                {AI_MODELS[ai.provider].map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="API key" id="ai-key" hint={ai.apiKeyConfigured ? 'An API key is already saved.' : undefined}>
              <Input id="ai-key" className={fieldClass} type="password" autoComplete="off" value={aiKey} placeholder={ai.apiKeyConfigured ? '••••••••' : ''} onChange={(event) => setAiKey(event.target.value)} />
            </Field>
            <Actions
              pending={pending}
              testId="ai-test"
              saveId="ai-save"
              onTest={() => {
                void run('ai-test', async () => {
                  const result = await apiRequest<unknown>('/admin/settings/test-ai', {
                    method: 'POST',
                    body: JSON.stringify({ provider: ai.provider, model: ai.model, apiKey: aiKey }),
                  });
                  if (!isConnectionTestResult(result)) {
                    throw new ApiError('The AI test returned an unexpected response.', 500);
                  }
                  return result.detail;
                });
              }}
            />
          </form>
        </SettingsCard>
      ) : null}

      {tab === 'cloudflare' ? (
        <SettingsCard title="Cloudflare Stream" description="Account ID and the Stream API token.">
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run('cf-save', () => saveCloudflare(cloudflare, cloudflareToken).then((next) => {
                setCloudflare(next);
                setCloudflareToken('');
                return 'Cloudflare settings saved.';
              }));
            }}
          >
            <Field label="Account ID" id="cf-account">
              <Input id="cf-account" className={fieldClass} value={cloudflare.accountId} onChange={(event) => setCloudflare({ ...cloudflare, accountId: event.target.value.trim() })} required />
            </Field>
            <Field label="Stream API token" id="cf-token" hint={cloudflare.apiTokenConfigured ? 'A token is already saved.' : undefined}>
              <Input id="cf-token" className={fieldClass} type="password" autoComplete="off" value={cloudflareToken} placeholder={cloudflare.apiTokenConfigured ? '••••••••' : ''} onChange={(event) => setCloudflareToken(event.target.value)} />
            </Field>
            <Actions
              pending={pending}
              testId="cf-test"
              saveId="cf-save"
              onTest={() => {
                void run('cf-test', async () => {
                  const result = await apiRequest<unknown>('/admin/settings/test-cloudflare', {
                    method: 'POST',
                    body: JSON.stringify({ accountId: cloudflare.accountId, apiToken: cloudflareToken }),
                  });
                  if (!isConnectionTestResult(result)) {
                    throw new ApiError('The Cloudflare test returned an unexpected response.', 500);
                  }
                  return result.detail;
                });
              }}
            />
          </form>
        </SettingsCard>
      ) : null}

      {tab === 'payment' ? (
        <SettingsCard title="Payment gateway and QRIS" description="Midtrans or Xendit server key, environment, and enabled methods.">
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run('pay-save', () => savePayment(payment, serverKey).then((next) => {
                setPayment(next);
                setServerKey('');
                return 'Payment settings saved.';
              }));
            }}
          >
            <Field label="Provider" id="pay-provider">
              <Select
                id="pay-provider"
                value={payment.provider}
                onChange={(value) => setPayment({ ...payment, provider: value === 'xendit' ? 'xendit' : 'midtrans' })}
              >
                <option value="midtrans">Midtrans</option>
                <option value="xendit">Xendit</option>
              </Select>
            </Field>
            <Field label="Environment" id="pay-mode">
              <Select
                id="pay-mode"
                value={payment.production ? 'production' : 'sandbox'}
                onChange={(value) => setPayment({ ...payment, production: value === 'production' })}
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </Select>
            </Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Methods</legend>
              <Check label="QRIS" checked={payment.qris} onChange={(qris) => setPayment({ ...payment, qris })} />
              <Check label="Virtual accounts" checked={payment.virtualAccount} onChange={(virtualAccount) => setPayment({ ...payment, virtualAccount })} />
              <Check label="Credit cards" checked={payment.creditCard} onChange={(creditCard) => setPayment({ ...payment, creditCard })} />
            </fieldset>
            <Field label="Server key" id="pay-key" hint={payment.serverKeyConfigured ? 'A server key is already saved.' : undefined}>
              <Input id="pay-key" className={fieldClass} type="password" autoComplete="off" value={serverKey} placeholder={payment.serverKeyConfigured ? '••••••••' : ''} onChange={(event) => setServerKey(event.target.value)} />
            </Field>
            <Actions
              pending={pending}
              testId="pay-test"
              saveId="pay-save"
              onTest={() => {
                void run('pay-test', async () => {
                  const result = await apiRequest<unknown>('/admin/settings/test-payment', {
                    method: 'POST',
                    body: JSON.stringify({
                      provider: payment.provider,
                      serverKey,
                      production: payment.production,
                      qris: payment.qris,
                      virtualAccount: payment.virtualAccount,
                      creditCard: payment.creditCard,
                    }),
                  });
                  if (!isConnectionTestResult(result)) {
                    throw new ApiError('The payment test returned an unexpected response.', 500);
                  }
                  return result.detail;
                });
              }}
            />
          </form>
        </SettingsCard>
      ) : null}

      {toast ? (
        <p
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${toast.tone === 'error' ? 'border-destructive/40 bg-background text-destructive' : 'border-border bg-card text-foreground'}`}
        >
          {toast.text}
        </p>
      ) : null}
    </div>
  );
}

function SettingsCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Select({
  id,
  value,
  onChange,
  children,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      id={id}
      className="h-11 rounded-md border border-input bg-transparent px-3 text-sm text-foreground"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-sm">
      <input type="checkbox" className="h-4 w-4" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function Actions({ pending, testId, saveId, onTest }: { pending: string | null; testId: string; saveId: string; onTest: () => void }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button type="button" variant="outline" className="min-h-11 sm:flex-1" disabled={pending !== null} onClick={onTest}>
        {pending === testId ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        Test connection
      </Button>
      <Button type="submit" className="min-h-11 sm:flex-1" disabled={pending !== null}>
        {pending === saveId ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        Save changes
      </Button>
    </div>
  );
}

async function saveSmtp(smtp: SmtpView, password: string): Promise<SmtpView> {
  const body = await apiRequest<unknown>('/admin/settings', {
    method: 'POST',
    body: JSON.stringify({ key: 'smtp', smtp: { host: smtp.host, port: smtp.port, username: smtp.username, password, fromEmail: smtp.fromEmail } }),
  });
  if (!isSmtpResponse(body)) {
    throw new ApiError('Settings were saved in an unexpected shape.', 500);
  }
  return normalizeSmtp(body.smtp);
}

async function saveAi(ai: AiView, apiKey: string): Promise<AiView> {
  const body = await apiRequest<unknown>('/admin/settings', {
    method: 'POST',
    body: JSON.stringify({ key: 'ai', ai: { provider: ai.provider, model: ai.model, apiKey } }),
  });
  if (!isAiResponse(body)) {
    throw new ApiError('Settings were saved in an unexpected shape.', 500);
  }
  return normalizeAi(body.ai);
}

async function saveCloudflare(cloudflare: CloudflareView, apiToken: string): Promise<CloudflareView> {
  const body = await apiRequest<unknown>('/admin/settings', {
    method: 'POST',
    body: JSON.stringify({ key: 'cloudflare', cloudflare: { accountId: cloudflare.accountId, apiToken } }),
  });
  if (!isCloudflareResponse(body)) {
    throw new ApiError('Settings were saved in an unexpected shape.', 500);
  }
  return normalizeCloudflare(body.cloudflare);
}

async function savePayment(payment: PaymentView, serverKey: string): Promise<PaymentView> {
  const body = await apiRequest<unknown>('/admin/settings', {
    method: 'POST',
    body: JSON.stringify({
      key: 'payment',
      payment: {
        provider: payment.provider,
        serverKey,
        production: payment.production,
        qris: payment.qris,
        virtualAccount: payment.virtualAccount,
        creditCard: payment.creditCard,
      },
    }),
  });
  if (!isPaymentResponse(body)) {
    throw new ApiError('Settings were saved in an unexpected shape.', 500);
  }
  return normalizePayment(body.payment);
}

function normalizeSmtp(value: SmtpView): SmtpView {
  return {
    host: typeof value.host === 'string' ? value.host : '',
    port: typeof value.port === 'number' ? value.port : 587,
    username: typeof value.username === 'string' ? value.username : '',
    fromEmail: typeof value.fromEmail === 'string' ? value.fromEmail : '',
    passwordConfigured: value.passwordConfigured === true,
  };
}

function normalizeAi(value: AiView): AiView {
  const provider: AiProvider = value.provider === 'anthropic' ? 'anthropic' : 'openai';
  const models = AI_MODELS[provider];
  const fallback = models[0]?.id ?? 'gpt-4o-mini';
  const model = models.some((item) => item.id === value.model) ? value.model : fallback;
  return { provider, model, apiKeyConfigured: value.apiKeyConfigured === true };
}

function normalizeCloudflare(value: CloudflareView): CloudflareView {
  return {
    accountId: typeof value.accountId === 'string' ? value.accountId : '',
    apiTokenConfigured: value.apiTokenConfigured === true,
  };
}

function normalizePayment(value: PaymentView): PaymentView {
  const provider: PaymentProvider = value.provider === 'xendit' ? 'xendit' : 'midtrans';
  return {
    provider,
    production: value.production === true,
    qris: value.qris !== false,
    virtualAccount: value.virtualAccount !== false,
    creditCard: value.creditCard !== false,
    serverKeyConfigured: value.serverKeyConfigured === true,
  };
}
