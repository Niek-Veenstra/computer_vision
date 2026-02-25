import axios from 'axios'

const loginUserServiceImpl = {
  async logUserIn() {
    return await axios.post()
  },
}

interface LoginUserService {
  logUserIn(): () => Promise<void>
}

export const loginUserService: LoginUserService = loginUserServiceImpl
