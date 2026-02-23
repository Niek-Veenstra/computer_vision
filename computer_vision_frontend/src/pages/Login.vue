<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { loginScheme } from '@/validation/login-validation'
import { treeifyError } from 'zod'

const email = ref('')
const password = ref('')

type ErrorType = string | null
const emailError = ref<ErrorType>(null)
const passwordError = ref<ErrorType>(null)

const emailErrorComputed = computed<{
  email: string | null
  invalid: boolean
}>((prev) => {
  if (email.value != prev?.email) return { email: email.value ?? '', invalid: false }
  return { email: email.value ?? '', invalid: true }
})
const passwordErrorComputed = computed<{
  password: string | null
  invalid: boolean
}>((prev) => {
  if (password.value != prev?.password) return { password: password.value ?? '', invalid: false }
  return { password: password.value ?? '', invalid: true }
})

const invalidFormState = () => {
  const result = loginScheme.safeParse({
    email,
    password,
  })
  if (result.error) {
    const errorTree = treeifyError(result.error)
    emailError.value = errorTree.properties?.mail?.errors.join(', ') ?? null
    passwordError.value = errorTree.properties?.password?.errors.join(', ') ?? null
    return true
  }
  return false
}

const onLoginButtonClick = () => {
  if (invalidFormState()) return
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
                <Field :data-invalid="emailErrorComputed.invalid">
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    :modelValue="email"
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    :aria-invalid="emailErrorComputed.invalid"
                  ></Input>
                  <FieldDescription> {{ emailError }} </FieldDescription>
                </Field>
                <Field :data-invalid="passwordErrorComputed.invalid">
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
                      :modelValue="password"
                      id="password"
                      type="password"
                      required
                      :aria-invalid="passwordErrorComputed.invalid"
                    />
                    <FieldDescription> {{ passwordError }} </FieldDescription>
                  </span>
                </Field>
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
