import { CertificateVerify } from '@/components/certificates/certificate-verify';

export default async function VerifyCertificatePage({ params }: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await params;
  return <CertificateVerify certificateId={certificateId} />;
}
