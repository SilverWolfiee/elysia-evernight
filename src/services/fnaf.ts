interface FnafApiResponse {
  profile: {
    id: number;
    username: string;
    display_name: string;
    bio: string;
    avatar_path: string;
    country: string;
    role: string;
  };
  mlRank: number;
  ulRank: number;
}

export const getFnafProfile = async(username : string):Promise <FnafApiResponse|null>=>{
    try {
        const response = await fetch(`https://fnafmml.com/api/profile/${username}`);
        if(!response.ok){
            console.log("Player not found or API is down")
            return null
        }
        return await response.json() as FnafApiResponse;
        }
        catch(error){
         console.error("Fnaf API error")
         return null;   
        }
    };
