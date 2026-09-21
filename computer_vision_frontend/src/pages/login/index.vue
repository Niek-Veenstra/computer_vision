<script setup lang="ts">
defineOptions({ name: 'LoginPage' })
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import FieldError from '@/components/ui/field/FieldError.vue'
import { Input } from '@/components/ui/input'
import { loginScheme } from '@/validation/login-validation'
import { postAuthentication } from '@/fetch/auth'
import { treeifyError } from 'zod'
import { useTokenStore } from '@/stores/token'

const email = ref('')
const password = ref('')

type ErrorType = string | null
const emailError = ref<ErrorType>(null)
const passwordError = ref<ErrorType>(null)

const emailInvalid = computed(() => emailError.value !== null)
const passwordInvalid = computed(() => passwordError.value !== null)

const serverErrorMessage = ref('')

const isLoading = ref(false)

const setRefValueNullWhenNotEquals = <T,>(oldValue: T, newValue: T, ref: Ref<T | null>): void => {
  if (oldValue !== newValue) {
    ref.value = null
  }
}

watch(email, (oldEmail, newEmail) => {
  setRefValueNullWhenNotEquals(oldEmail, newEmail, emailError)
})
watch(password, (oldPassword, newPassword) => {
  setRefValueNullWhenNotEquals(oldPassword, newPassword, passwordError)
})

const formIsInvalid = () => {
  const result = loginScheme.safeParse({
    email: email.value,
    password: password.value,
  })
  if (!result.success) {
    return {
      success: false,
      error: treeifyError(result.error),
    } as const
  }
  return {
    success: true,
    error: null,
  } as const
}

const router = useRouter()
const route = useRoute('login')

const onLoginButtonClick = async () => {
  if (isLoading.value) return
  const { success, error } = formIsInvalid()
  if (!success) {
    emailError.value = error.properties?.email?.errors.join(', ') ?? null
    passwordError.value = error.properties?.password?.errors.join(', ') ?? null
    return
  }

  isLoading.value = true
  serverErrorMessage.value = ''

  try {
    const authFetch = postAuthentication({
      email: email.value,
      password: password.value,
    })
    await authFetch.execute()
    if (authFetch.error.value) {
      serverErrorMessage.value =
        authFetch.error.value instanceof Error
          ? authFetch.error.value.message
          : 'An error occurred during login.'
      return
    }
    const token = authFetch.data.value?.token
    if (!token) throw new Error('Authentication response did not contain a token.')
    const tokenStore = useTokenStore()
    tokenStore.setToken(token)
    const requested = route.query.redirect
    const destination =
      typeof requested === 'string' &&
      requested.startsWith('/') &&
      !requested.startsWith('//') &&
      !requested.includes('\\')
        ? requested
        : '/home'
    await router.replace(destination)
  } catch {
    serverErrorMessage.value = 'An error occurred during login.'
  } finally {
    isLoading.value = false
  }
}
</script>

<route lang="json">
{ "name": "login", "meta": { "breadcrumb": "Login" } }
</route>
<template>
  <div class="flex w-full flex-1 items-center justify-center">
    <div class="w-full max-w-sm">
      <div class="flex flex-col gap-6">
        <Card>
          <CardHeader class="text-center">
            <CardTitle class="text-xl"> Welcome back </CardTitle>
            <CardDescription> Login with your account </CardDescription>
          </CardHeader>
          <CardContent>
            <form>
              <FieldGroup>
                <Field :data-invalid="emailInvalid">
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    :v-model="email"
                    @update:modelValue="(value) => (email = value as string)"
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    :aria-invalid="emailInvalid"
                  ></Input>
                  <FieldDescription> {{ emailError }} </FieldDescription>
                </Field>
                <Field :data-invalid="passwordInvalid">
                  <div class="flex items-center">
                    <FieldLabel for="password"> Password </FieldLabel>
                    <a
                      href="#"
                      class="ml-auto text-card-foreground underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <span class="flex gap-3 flex-col">
                    <Input
                      :v-model="password"
                      @update:modelValue="(value) => (password = value as string)"
                      id="password"
                      type="password"
                      required
                      :aria-invalid="passwordInvalid"
                    />
                    <FieldDescription> {{ passwordError }} </FieldDescription>
                  </span>
                </Field>
                <FieldError v-if="serverErrorMessage">
                  {{ serverErrorMessage }}
                </FieldError>
                <Field>
                  <Button type="button" @click="onLoginButtonClick" :disabled="isLoading">
                    {{ isLoading ? 'Logging in...' : 'Login' }}
                  </Button>
                  <FieldDescription class="text-center">
                    Don't have an account?
                    <RouterLink :to="{ name: 'register' }">Sign up</RouterLink>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <FieldDescription class="px-6 text-center">
          By clicking continue, you agree to our <a href="#">Terms of Service</a> and
          <a href="#">Privacy Policy</a>.
        </FieldDescription>
      </div>
    </div>
  </div>
</template>
