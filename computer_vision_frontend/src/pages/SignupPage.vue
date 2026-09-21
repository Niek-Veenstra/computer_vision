<script setup lang="ts">
import { ref } from 'vue'

import { userRegistrationScheme } from '@/validation/registration-validation'
import { createUser } from '@/fetch/user'
import { getLocalTimeZone, today } from '@internationalized/date'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import FieldError from '@/components/ui/field/FieldError.vue'
import { Input } from '@/components/ui/input'
import { validateScheme } from '@/validation/validate-scheme'
import { useFormField } from '@/composables/use-form-field'
import { parseError } from '@/fetch/parse-error'
import { useFormFieldValues } from '@/composables/use-form-field-values'
import Datepicker from '@/components/ui/datepicker/Datepicker.vue'
import { setFieldErrors } from '@/ui/form/setFieldErrors'

const router = useRouter()

const fields = {
  firstName: useFormField(''),
  lastName: useFormField(''),
  email: useFormField(''),
  password: useFormField(''),
  birthDate: useFormField(today(getLocalTimeZone()), (value) => value.toDate(getLocalTimeZone())),
  passwordConfirm: useFormField(''),
}

const formValues = useFormFieldValues(fields)

const serverErrorMessage = ref('')
const isFinished = ref(false)
const statusCode = ref<number | null>(0)

const onRegisterButtonClick = async () => {
  const { success, error } = validateScheme(formValues.value, userRegistrationScheme)
  if (!success) {
    const objErrors = Object.fromEntries(
      Object.entries(error.properties ?? {}).map(([key, value]) => [key, value.errors.join(', ')]),
    )
    setFieldErrors(fields, objErrors)
    return
  }

  const response = await createUser(formValues.value)
  if (response.error.value != null) {
    const message = await parseError(response)
    serverErrorMessage.value = message.message ?? 'Registration failed'
  }
  isFinished.value = response.isFinished.value
  statusCode.value = response.statusCode.value
}
</script>

<template>
  <div class="flex min-h-svh w-full items-center justify-center p-6">
    <div class="w-full max-w-sm">
      <div class="flex flex-col gap-1">
        <Card>
          <CardHeader class="text-center">
            <CardTitle class="text-xl"> Create an account </CardTitle>
            <CardDescription> Enter your information to create your account </CardDescription>
          </CardHeader>

          <CardContent>
            <form>
              <FieldGroup class="gap-2">
                <Field :data-invalid="fields.firstName.invalid.value">
                  <FieldLabel htmlFor="name">First Name</FieldLabel>
                  <Input
                    v-model="fields.firstName.formValue.value"
                    id="name"
                    type="text"
                    placeholder="Enter your first name"
                    required
                    :aria-invalid="fields.firstName.invalid"
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
                  <Button type="button" @click="onRegisterButtonClick"> Create Account </Button>

                  <FieldDescription class="text-center">
                    Already have an account?
                    <a @click="router.push('/login')" href="#"> Log in </a>
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
