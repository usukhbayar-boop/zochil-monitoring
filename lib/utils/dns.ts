import dns from "dns";
import psl from "psl";

export async function resolveAndCheckNS(domain: string) {
  return new Promise((done) => {
    dns.resolveNs(domain, (error, addresses) => {
      if (error) {
        done(`Error while resolving. MESSAGE: ${error.message}`);
      } else {
        const records = [...addresses]
          .sort()
          .map((ns) => ns.replace(".digitalocean.com.", ".digitalocean.com"));

        if (
          records.length === 3 &&
          records[0] === "ns1.digitalocean.com" &&
          records[1] === "ns2.digitalocean.com" &&
          records[2] === "ns3.digitalocean.com"
        ) {
          done(true);
        } else {
          done(false);
        }
      }
    });
  });
}

export async function resolveAndCheckIP(domain: string) {
  const parsedDomain: any = psl.parse(domain);
  const isValid = await doResolveAndCheckIP(domain);

  if (!parsedDomain.subdomain) {
    const isSubdomainValid = await doResolveAndCheckIP(`www.${domain}`);
    return isSubdomainValid && isValid;
  } else {
    return isValid;
  }
}


export async function doResolveAndCheckIP(domain: string) {
  return new Promise<boolean>((done) => {
    dns.resolve4(domain, (error, addresses) => {
      if (error) {
        done(false);
      } else {
        if (
          addresses &&
          addresses.length === 1 &&
          addresses[0] === process.env.STOREFRONT_IP_ADDRESS
        ) {
          done(true);
        } else {
          done(false);
        }
      }
    });
  });
}
