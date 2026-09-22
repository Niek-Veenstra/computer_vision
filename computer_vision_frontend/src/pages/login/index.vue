<script setup lang="ts">
defineOptions({ name: 'LoginPage' })
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import FieldError from '@/components/ui/field/FieldError.vue'
import { Input } from '@/components/ui/input'
import { useFormField } from '@/composables/use-form-field'
import { useFormFieldValues } from '@/composables/use-form-field-values'
import { loginScheme } from '@/validation/login-validation'
import { validateScheme } from '@/validation/validate-scheme'
import { postAuthentication } from '@/fetch/auth'
import { useTokenStore } from '@/stores/token'
import { setFieldErrors } from '@/ui/form/setFieldErrors'

const fields = {
  email: useFormField(''),
  password: useFormField(''),
}
const formValues = useFormFieldValues(fields)

const serverErrorMessage = ref('')

const isLoading = ref(false)

const router = useRouter()
const route = useRoute('login')

const onLoginButtonClick = async () => {
  if (isLoading.value) return
  const validation = validateScheme(formValues.value, loginScheme)
  if (!validation.success) {
    const errors = Object.fromEntries(
      Object.entries(validation.error.properties ?? {}).map(([key, value]) => [
        key,
        value.errors.join(', '),
      ]),
    )
    setFieldErrors(fields, errors)
    return
  }

  isLoading.value = true
  serverErrorMessage.value = ''

  try {
    const authFetch = postAuthentication(validation.data)
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
            <form novalidate @submit.prevent="onLoginButtonClick">
              <FieldGroup>
                <Field :data-invalid="fields.email.invalid.value">
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    v-model="fields.email.formValue.value"
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    :aria-invalid="fields.email.invalid.value"
                  ></Input>
                  <FieldDescription> {{ fields.email.error }} </FieldDescription>
                </Field>
                <Field :data-invalid="fields.password.invalid.value">
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
                      v-model="fields.password.formValue.value"
                      id="password"
                      type="password"
                      required
                      :aria-invalid="fields.password.invalid.value"
                    />
                    <FieldDescription> {{ fields.password.error }} </FieldDescription>
                  </span>
                </Field>
                <FieldError v-if="serverErrorMessage">
                  {{ serverErrorMessage }}
                </FieldError>
                <Field>
                  <Button type="submit" :disabled="isLoading">
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
