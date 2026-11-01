import React from 'react';
import {
  Box,
  Cloud,
  Cpu,
  GitBranch,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Key,
  Coffee,
  Smartphone,
  Bot,
  Terminal,
  Database,
  Server,
  Code,
  Layers,
  Globe,
  Lock,
  Activity,
  Zap,
  Workflow,
  Sparkles,
  CheckCircle2,
  Radio,
  FileCode,
  Binary,
  Container,
  Flame,
  Layout,
  HardDrive,
  LucideIcon,
} from 'lucide-react';

export interface IconDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  category: string;
}

export const AVAILABLE_SKILL_ICONS: IconDefinition[] = [
  { id: 'box', label: 'Kubernetes / Box', icon: Box, category: 'Containers' },
  { id: 'container', label: 'Docker Container', icon: Container || Box, category: 'Containers' },
  { id: 'cloud', label: 'Cloud / AWS / GCP', icon: Cloud, category: 'Cloud' },
  { id: 'binary', label: 'Terraform / IaC', icon: Binary, category: 'Cloud' },
  { id: 'cpu', label: 'Jenkins / Compute', icon: Cpu, category: 'DevSecOps' },
  { id: 'git-branch', label: 'Git / GitHub Actions', icon: GitBranch, category: 'DevSecOps' },
  { id: 'shield', label: 'SonarQube / Security', icon: Shield, category: 'DevSecOps' },
  { id: 'shield-alert', label: 'Trivy / Vulnerability', icon: ShieldAlert, category: 'DevSecOps' },
  { id: 'shield-check', label: 'Compliance / Shield', icon: ShieldCheck, category: 'DevSecOps' },
  { id: 'key', label: 'Vault / Secrets', icon: Key, category: 'Security' },
  { id: 'lock', label: 'Zero Trust / Auth', icon: Lock, category: 'Security' },
  { id: 'coffee', label: 'Java / Backend', icon: Coffee, category: 'Languages' },
  { id: 'code', label: 'Code / TypeScript', icon: Code, category: 'Languages' },
  { id: 'file-code', label: 'Scripts / Python', icon: FileCode, category: 'Languages' },
  { id: 'smartphone', label: 'Android / Mobile', icon: Smartphone, category: 'Mobile' },
  { id: 'bot', label: 'AI Agents / LangChain', icon: Bot, category: 'AI' },
  { id: 'sparkles', label: 'GenAI / LLM', icon: Sparkles, category: 'AI' },
  { id: 'terminal', label: 'Linux / CLI / Bash', icon: Terminal, category: 'Systems' },
  { id: 'server', label: 'Server / Microservices', icon: Server, category: 'Systems' },
  { id: 'database', label: 'Database / SQL / R2', icon: Database, category: 'Data' },
  { id: 'hard-drive', label: 'Storage / Volumes', icon: HardDrive, category: 'Data' },
  { id: 'layers', label: 'Architecture / Stack', icon: Layers, category: 'Architecture' },
  { id: 'layout', label: 'Frontend / UI', icon: Layout, category: 'Frontend' },
  { id: 'globe', label: 'Web / Cloudflare Edge', icon: Globe, category: 'Network' },
  { id: 'activity', label: 'Monitoring / Metrics', icon: Activity, category: 'Observability' },
  { id: 'zap', label: 'High Performance / CDN', icon: Zap, category: 'Network' },
  { id: 'workflow', label: 'Automation / n8n', icon: Workflow, category: 'Automation' },
  { id: 'radio', label: 'WebSockets / Realtime', icon: Radio, category: 'Network' },
  { id: 'flame', label: 'Fast / Prometheus', icon: Flame, category: 'Observability' },
  { id: 'check-circle', label: 'Testing / QA', icon: CheckCircle2, category: 'Testing' },
];

const ICON_MAP: Record<string, LucideIcon> = AVAILABLE_SKILL_ICONS.reduce(
  (acc, item) => {
    acc[item.id] = item.icon;
    return acc;
  },
  {} as Record<string, LucideIcon>
);

interface SkillIconProps {
  identifier?: string;
  className?: string;
  title?: string;
}

export const SkillIcon: React.FC<SkillIconProps> = ({
  identifier = 'layers',
  className = 'w-6 h-6 text-brand-primary',
  title,
}) => {
  const normalized = (identifier || 'layers').toLowerCase().trim();
  const IconComponent = ICON_MAP[normalized] || Terminal;

  return (
    <IconComponent
      className={className}
      aria-label={title || normalized}
      role="img"
    />
  );
};

