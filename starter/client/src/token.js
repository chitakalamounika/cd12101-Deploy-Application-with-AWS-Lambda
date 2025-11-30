import { useAuth0 } from '@auth0/auth0-react';

export function useApiToken() {
  const { getAccessTokenSilently } = useAuth0();
  return async () =>
    getAccessTokenSilently({
      audience: process.env.REACT_APP_AUTH0_AUDIENCE,
    });
}
