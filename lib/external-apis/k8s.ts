import fs from "fs";
import psl from "psl";
import { promisify } from "util";
import { exec } from "child_process";

const cmdExec = promisify(exec);

export async function configure(domain: string, theme: string) {
  const ingress = buildIngress(domain, theme);
  const ingressPath = `/tmp/${domain}.conf`;
  fs.writeFileSync(ingressPath, ingress);
  const { stderr, stdout } = await cmdExec(`kubectl apply -f ${ingressPath} --kubeconfig ${process.env.KUBECONFIG_PATH}`);

  console.log(stderr);
  console.log(stdout);

  try {
    await cmdExec(`rm ${ingressPath}`);
  } catch {}
}

export async function remove(domain: string) {
  const ingressName = `${domain}`.replace(/\./g, "-");
  await cmdExec(`kubectl delete certificate ${ingressName}-tls`);
  await cmdExec(`kubectl delete ingress ${ingressName}`);
}

function buildIngress(domain: string, theme: string) {
  const themeMap: any = {
    legacy: "web-v1-legacy",
    default: "web-storefront"
  };

  const header = buildIngressHeader(domain);
  const ingress = `${header}
    rules:
      - host: ${domain}
        http:
          paths:
          - pathType: Prefix
            path: "/"
            backend:
              service:
                name: ${themeMap[theme]}
                port:
                  number: 80`;

  return ingress;
}

function buildIngressHeader(domain: string) {
  const parsedDomain: any = psl.parse(domain);
  const ingressName = `${domain}`.replace(/\./g, "-");
  const header = `
  apiVersion: networking.k8s.io/v1
  kind: Ingress
  metadata:
    name: ${ingressName}
    annotations:
      kubernetes.io/ingress.class: nginx
      cert-manager.io/cluster-issuer: letsencrypt-prod
      ${!parsedDomain.subdomain ? 'nginx.ingress.kubernetes.io/from-to-www-redirect: "true"': '# -'}
  spec:
    tls:
      - hosts:
          - ${domain}
          ${ !parsedDomain.subdomain ? `- www.${domain}` : '# - ' }
        secretName: ${ingressName}-tls`;

  return header;
}
