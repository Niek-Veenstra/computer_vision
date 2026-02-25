<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import FieldError from '@/components/ui/field/FieldError.vue'
import { Input } from '@/components/ui/input'
import { postAuthentication } from '@/fetch/auth'
import { loginScheme } from '@/validation/login-validation'
import { treeifyError } from 'zod'

const email = ref('')
const password = ref('')

type ErrorType = string | null
const emailError = ref<ErrorType>(null)
const passwordError = ref<ErrorType>(null)

const emailInvalid = computed(() => emailError.value !== null)
const passwordInvalid = computed(() => passwordError.value !== null)

let serverErrorMessage = ref('')

let isFinished = ref(false)
let statusCode = ref<number | null>(0)

const nullNotEquals = <T,>(oldValue: T, newValue: T, ref: Ref<T | null>): void => {
  if (oldValue !== newValue) {
    ref.value = null
  }
}

watch(email, (oldEmail, newEmail) => {
  nullNotEquals(oldEmail, newEmail, emailError)
})
watch(password, (oldPassword, newPassword) => {
  nullNotEquals(oldPassword, newPassword, passwordError)
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

const onLoginButtonClick = async () => {
  const { success, error } = formIsInvalid()
  if (!success) {
    emailError.value = error.properties?.email?.errors.join(', ') ?? null
    passwordError.value = error.properties?.password?.errors.join(', ') ?? null
    return
  }
  const {
    isFinished: isFinishedLocal,
    statusCode: statusCodeLocal,
    data,
  } = await postAuthentication({ email: email.value, password: password.value })
  isFinished = isFinishedLocal
  statusCode = statusCodeLocal
  serverErrorMessage = data
}
</script>
<template>
  <div class="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
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
                <FieldError v-if="isFinished && statusCode !== 200">
                  {{ serverErrorMessage }}
                </FieldError>
                <Field>
                  <Button type="button" @click="onLoginButtonClick"> Login </Button>
                  <FieldDescription class="text-center">
                    Don't have an account?
                    <a href="#"> Sign up </a>
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
