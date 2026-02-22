<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { loginScheme } from '@/validation/login-validation'

const email = ref('')
const password = ref('')

const emailError = computed((prev) => {})
const passwordError = computed((prev) => {
  console.log(prev)
  if (password.value != prev) return { password: password.value }
  return { password: password.value }
})

const onLoginButtonClick = () => {
  console.log('click')
  const result = loginScheme.safeParse({
    email,
    password,
  })
  if (result.error) {
    if (result.error.issues) return
  }
  console.log(result)
  if (result) console.log('hi')
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
                <Field :data-invalid="!(emailError && passwordError)">
                  <!-- <FieldLabel for="email"> Email </FieldLabel> -->
                  <FieldLabel htmlFor="email">Invalid Input</FieldLabel>
                  <Input
                    :modelValue="email"
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    aria-invalid
                  ></Input>
                  <FieldDescription> This field contains validation errors. </FieldDescription>
                </Field>
                <Field>
                  <div class="flex items-center">
                    <FieldLabel for="password"> Password </FieldLabel>
                    <a href="#" class="ml-auto text-sm underline-offset-4 hover:underline">
                      Forgot your password?
                    </a>
                  </div>
                  <Input :modelValue="password" id="password" type="password" required />
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
