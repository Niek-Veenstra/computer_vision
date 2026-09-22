<script setup lang="ts">
defineOptions({ name: 'SignupPage' })
import { ref } from 'vue'

import { userRegistrationScheme } from '@/validation/registration-validation'
import { createUser } from '@/fetch/user'
import { getLocalTimeZone, today } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import FieldError from '@/components/ui/field/FieldError.vue'
import { Input } from '@/components/ui/input'
import { validateScheme } from '@/validation/validate-scheme'
import { useFormField } from '@/composables/use-form-field'
import { useFormFieldValues } from '@/composables/use-form-field-values'
import Datepicker from '@/components/ui/datepicker/Datepicker.vue'
import { setFieldErrors } from '@/ui/form/setFieldErrors'

const fields = {
  firstName: useFormField(''),
  lastName: useFormField(''),
  email: useFormField(''),
  password: useFormField(''),
  birthDate: useFormField<DateValue | undefined, string | undefined>(
    today(getLocalTimeZone()),
    (value) => value?.toString(),
  ),
  passwordConfirm: useFormField(''),
}

const formValues = useFormFieldValues(fields)

const serverErrorMessage = ref('')
const isFinished = ref(false)
const statusCode = ref<number | null>(0)

const onRegisterButtonClick = async () => {
  const validation = validateScheme(formValues.value, userRegistrationScheme)
  if (!validation.success) {
    const objErrors = Object.fromEntries(
      Object.entries(validation.error.properties ?? {}).map(([key, value]) => [
        key,
        value.errors.join(', '),
      ]),
    )
    setFieldErrors(fields, objErrors)
    return
  }

  const response = await createUser(validation.data)
  if (response.error.value != null) {
    serverErrorMessage.value =
      response.error.value instanceof Error ? response.error.value.message : 'Registration failed'
  }
  isFinished.value = response.isFinished.value
  statusCode.value = response.statusCode.value
}
</script>

<route lang="json">
{ "name": "register", "meta": { "breadcrumb": "Sign up" } }
</route>

<template>
  <div class="flex w-full flex-1 items-center justify-center">
    <div class="w-full max-w-sm">
      <div class="flex flex-col gap-1">
        <Card>
          <CardHeader class="text-center">
            <CardTitle class="text-xl"> Create an account </CardTitle>
            <CardDescription> Enter your information to create your account </CardDescription>
          </CardHeader>

          <CardContent>
            <form novalidate @submit.prevent="onRegisterButtonClick">
              <FieldGroup class="gap-2">
                <Field :data-invalid="fields.firstName.invalid.value">
                  <FieldLabel htmlFor="name">First Name</FieldLabel>
                  <Input
                    v-model="fields.firstName.formValue.value"
                    id="name"
                    type="text"
                    placeholder="Enter your first name"
                    required
                    :aria-invalid="fields.firstName.invalid.value"
                  />
                  <FieldDescription>{{ fields.firstName.error }}</FieldDescription>
                </Field>

                <Field :data-invalid="fields.lastName.invalid.value">
                  <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                  <Input
                    v-model="fields.lastName.formValue.value"
                    id="lastName"
                    type="text"
                    placeholder="Enter your last name"
                    required
                    :aria-invalid="fields.lastName.invalid.value"
                  />
                  <FieldDescription>{{ fields.lastName.error }}</FieldDescription>
                </Field>

                <Field :data-invalid="fields.birthDate.invalid.value">
                  <FieldLabel htmlFor="lastName">Birthdate</FieldLabel>
                  <Datepicker v-model="fields.birthDate.formValue.value"> </Datepicker>
                  <FieldDescription>{{ fields.birthDate.error }}</FieldDescription>
                </Field>

                <Field :data-invalid="fields.email.invalid.value">
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    v-model="fields.email.formValue.value"
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    :aria-invalid="fields.email.invalid.value"
                  />
                  <FieldDescription>{{ fields.email.error }}</FieldDescription>
                </Field>

                <Field :data-invalid="fields.password.invalid.value">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    v-model="fields.password.formValue.value"
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    :aria-invalid="fields.password.invalid.value"
                  />
                  <FieldDescription>{{ fields.password.error }}</FieldDescription>
                </Field>

                <Field :data-invalid="fields.passwordConfirm.invalid.value">
                  <FieldLabel htmlFor="passwordConfirm"> Confirm Password </FieldLabel>
                  <Input
                    v-model="fields.passwordConfirm.formValue.value"
                    id="passwordConfirm"
                    type="password"
                    placeholder="Confirm your password"
                    required
                    :aria-invalid="fields.passwordConfirm.invalid.value"
                  />
                  <FieldDescription>
                    {{ fields.passwordConfirm.error }}
                  </FieldDescription>
                </Field>
                <FieldError v-if="isFinished && statusCode !== 201">
                  {{ serverErrorMessage }}
                </FieldError>

                <Field>
                  <Button type="submit"> Create Account </Button>

                  <FieldDescription class="text-center">
                    Already have an account?
                    <RouterLink :to="{ name: 'login' }">Log in</RouterLink>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <FieldDescription class="px-6 text-center">
          By clicking continue, you agree to our
          <a href="#">Terms of Service</a>
          and
          <a href="#">Privacy Policy</a>.
        </FieldDescription>
      </div>
    </div>
  </div>
</template>
