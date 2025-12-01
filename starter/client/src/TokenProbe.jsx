import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export default function TokenProbe() {
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    // Expose a global helper in the browser console
    window.getToken = async (opts = {}) => {
      const token = await getAccessTokenSilently({
        audience: process.env.REACT_APP_AUTH0_AUDIENCE,
        ...opts,
      });
      console.log("🔑 Access Token =>", token);
      return token;
    };
    console.log("✅ TokenProbe ready — run this in console:");
    console.log("   const t = await window.getToken();");
  }, [getAccessTokenSilently]);

  return null;
}
