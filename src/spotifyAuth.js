// spotifyAuth.js
export const fetchSpotifyToken = async () => {
    const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET;
    const tokenUrl = 'https://accounts.spotify.com/api/token';
  
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`)
    };
  
    const body = new URLSearchParams({
      grant_type: 'client_credentials'
    });
  
    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: headers,
        body: body
      });
  
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
  
      const data = await response.json();
      console.log(data.access_token)
      return data.access_token;
      
    } catch (error) {
      console.error('Failed to fetch access token:', error);
      return null;
    }
  };
  