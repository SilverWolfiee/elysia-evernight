import {Elysia, t} from 'elysia'
import { getFnafProfile } from '../services/fnaf'

export const fnaf = new Elysia({prefix : '/fnafmml'})


fnaf.get('/profile/:username', async({params : {username}, set})=>{
    const data = await getFnafProfile(username)
    if(!data){
        set.status = 404;
        return{error : 'Player not found'}
    }
    const {profile, mlRank, ulRank} = data;
    return {
      profile: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        bio: profile.bio,
        avatar_path: profile.avatar_path,
        country: profile.country,
        role: profile.role
      },
      mlRank,
      ulRank
    };
  }, {
    params: t.Object({
      username: t.String()
    })
})