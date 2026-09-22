<script setup lang="ts">
defineOptions({ name: 'SettingsPage' })

import { onMounted, ref } from 'vue'
import { UserRoundIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useFormField } from '@/composables/use-form-field'
import { useFormFieldValues } from '@/composables/use-form-field-values'
import type { User } from '@/domain/user'
import { changeCurrentUserPassword, getCurrentUser, updateCurrentUser } from '@/fetch/user'
import { useUserStore } from '@/stores/user'
import { setFieldErrors } from '@/ui/form/setFieldErrors'
import { passwordChangeScheme, profileScheme } from '@/validation/settings-validation'
import { validateScheme } from '@/validation/validate-scheme'

const MAX_LOGO_SIZE = 1024 * 1024
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const userStore = useUserStore()
const profileFields = {
  firstName: useFormField(''),
  lastName: useFormField(''),
  email: useFormField(''),
  logoDataUrl: useFormField<string | null>(null),
}
const profileValues = useFormFieldValues(profileFields)
const passwordFields = {
  currentPassword: useFormField(''),
  newPassword: useFormField(''),
  passwordConfirm: useFormField(''),
}
const passwordValues = useFormFieldValues(passwordFields)

const profileLoading = ref(true)
const profileSaving = ref(false)
const passwordSaving = ref(false)
const profileError = ref('')
const passwordError = ref('')
const profileSuccess = ref('')
const passwordSuccess = ref('')

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function populateProfile(user: User) {
  profileFields.firstName.formValue.value = user.firstName
  profileFields.lastName.formValue.value = user.lastName
  profileFields.email.formValue.value = user.email
  profileFields.logoDataUrl.formValue.value = user.logoDataUrl
}

async function loadProfile() {
  profileLoading.value = true
  profileError.value = ''
  try {
    const request = getCurrentUser()
    await request.execute()
    if (request.error.value) throw request.error.value
    if (!request.data.value) throw new Error('The account response was empty.')
    userStore.setUser(request.data.value)
    populateProfile(request.data.value)
  } catch (error) {
    profileError.value = messageOf(error, 'Could not load your account.')
  } finally {
    profileLoading.value = false
  }
}

if (userStore.user) populateProfile(userStore.user)
onMounted(() => void loadProfile())

function readLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read the logo.'))
    }
    reader.onerror = () => reject(new Error('Could not read the logo.'))
    reader.readAsDataURL(file)
  })
}

async function selectLogo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  if (!LOGO_TYPES.includes(file.type)) {
    profileFields.logoDataUrl.error.value = 'Choose a PNG, JPEG or WebP image.'
    return
  }
  if (file.size > MAX_LOGO_SIZE) {
    profileFields.logoDataUrl.error.value = 'Choose an image smaller than 1 MB.'
    return
  }
  try {
    profileFields.logoDataUrl.formValue.value = await readLogo(file)
    profileFields.logoDataUrl.error.value = null
    profileSuccess.value = ''
  } catch (error) {
    profileFields.logoDataUrl.error.value = messageOf(error, 'Could not read the logo.')
  }
}

async function saveProfile() {
  if (profileSaving.value || profileLoading.value) return
  const validation = validateScheme(profileValues.value, profileScheme)
  if (!validation.success) {
    const errors = Object.fromEntries(
      Object.entries(validation.error.properties ?? {}).map(([key, value]) => [
        key,
        value.errors.join(', '),
      ]),
    )
    setFieldErrors(profileFields, errors)
    return
  }

  profileSaving.value = true
  profileError.value = ''
  profileSuccess.value = ''
  try {
    const request = updateCurrentUser(validation.data)
    await request.execute()
    if (request.error.value) throw request.error.value
    if (!request.data.value) throw new Error('The account response was empty.')
    userStore.setUser(request.data.value)
    populateProfile(request.data.value)
    profileSuccess.value = 'Account details saved.'
  } catch (error) {
    profileError.value = messageOf(error, 'Could not save your account.')
  } finally {
    profileSaving.value = false
  }
}

async function changePassword() {
  if (passwordSaving.value) return
  const validation = validateScheme(passwordValues.value, passwordChangeScheme)
  if (!validation.success) {
    const errors = Object.fromEntries(
      Object.entries(validation.error.properties ?? {}).map(([key, value]) => [
        key,
        value.errors.join(', '),
      ]),
    )
    setFieldErrors(passwordFields, errors)
    return
  }

  passwordSaving.value = true
  passwordError.value = ''
  passwordSuccess.value = ''
  try {
    const request = changeCurrentUserPassword({
      currentPassword: validation.data.currentPassword,
      newPassword: validation.data.newPassword,
    })
    await request.execute()
    if (request.error.value) throw request.error.value
    passwordFields.currentPassword.formValue.value = ''
    passwordFields.newPassword.formValue.value = ''
    passwordFields.passwordConfirm.formValue.value = ''
    passwordSuccess.value = 'Password changed.'
  } catch (error) {
    passwordError.value = messageOf(error, 'Could not change your password.')
  } finally {
    passwordSaving.value = false
  }
}
</script>
<route lang="json">
{ "name": "settings", "meta": { "breadcrumb": "Settings" } }
</route>
<template>
  <div class="space-y-8">
    <header>
      <h1 class="text-3xl font-semibold tracking-tight">Settings</h1>
      <p class="mt-2 text-sm text-muted-foreground">Manage your account details and security.</p>
    </header>

    <section class="rounded-xl border bg-card p-5 shadow-xs sm:p-6" aria-labelledby="profile-heading">
      <h2 id="profile-heading" class="text-lg font-semibold">Profile</h2>
      <p class="mt-1 text-sm text-muted-foreground">Update your name, email and account logo.</p>

      <p v-if="profileLoading" class="mt-6 text-sm text-muted-foreground" role="status">
        Loading your account…
      </p>
      <form v-else class="mt-6 space-y-6" novalidate @submit.prevent="saveProfile">
        <div class="flex flex-wrap items-center gap-5">
          <span class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
            <img
              v-if="profileFields.logoDataUrl.formValue.value"
              :src="profileFields.logoDataUrl.formValue.value"
              alt="Account logo preview"
              class="size-full object-contain"
            />
            <UserRoundIcon v-else class="size-8 text-muted-foreground" aria-hidden="true" />
          </span>
          <div class="space-y-2">
            <label for="account-logo" class="block text-sm font-medium">Account logo</label>
            <Input
              id="account-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="max-w-xs"
              :disabled="profileSaving"
              :aria-invalid="profileFields.logoDataUrl.invalid.value"
              @change="selectLogo"
            />
            <p class="text-xs text-muted-foreground">PNG, JPEG or WebP, up to 1 MB.</p>
            <p v-if="profileFields.logoDataUrl.error.value" class="text-sm text-destructive" role="alert">
              {{ profileFields.logoDataUrl.error.value }}
            </p>
            <Button
              v-if="profileFields.logoDataUrl.formValue.value"
              type="button"
              variant="ghost"
              size="sm"
              :disabled="profileSaving"
              @click="profileFields.logoDataUrl.formValue.value = null"
            >
              Remove logo
            </Button>
          </div>
        </div>

        <FieldGroup class="max-w-2xl gap-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <Field :data-invalid="profileFields.firstName.invalid.value">
              <FieldLabel for="first-name">First name</FieldLabel>
              <Input
                id="first-name"
                v-model="profileFields.firstName.formValue.value"
                autocomplete="given-name"
                :aria-invalid="profileFields.firstName.invalid.value"
              />
              <FieldDescription v-if="profileFields.firstName.error.value">{{ profileFields.firstName.error.value }}</FieldDescription>
            </Field>
            <Field :data-invalid="profileFields.lastName.invalid.value">
              <FieldLabel for="last-name">Last name</FieldLabel>
              <Input
                id="last-name"
                v-model="profileFields.lastName.formValue.value"
                autocomplete="family-name"
                :aria-invalid="profileFields.lastName.invalid.value"
              />
              <FieldDescription v-if="profileFields.lastName.error.value">{{ profileFields.lastName.error.value }}</FieldDescription>
            </Field>
          </div>
          <Field :data-invalid="profileFields.email.invalid.value">
            <FieldLabel for="account-email">Email</FieldLabel>
            <Input
              id="account-email"
              v-model="profileFields.email.formValue.value"
              type="email"
              autocomplete="email"
              :aria-invalid="profileFields.email.invalid.value"
            />
            <FieldDescription v-if="profileFields.email.error.value">{{ profileFields.email.error.value }}</FieldDescription>
          </Field>
        </FieldGroup>

        <p v-if="profileError" class="text-sm text-destructive" role="alert">{{ profileError }}</p>
        <p v-if="profileSuccess" class="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {{ profileSuccess }}
        </p>
        <Button type="submit" :disabled="profileSaving || !userStore.user">
          {{ profileSaving ? 'Saving…' : 'Save changes' }}
        </Button>
      </form>
      <div v-if="profileError && !userStore.user && !profileLoading" class="mt-4">
        <Button variant="outline" size="sm" @click="loadProfile">Retry loading</Button>
      </div>
    </section>

    <section class="rounded-xl border bg-card p-5 shadow-xs sm:p-6" aria-labelledby="password-heading">
      <h2 id="password-heading" class="text-lg font-semibold">Password</h2>
      <p class="mt-1 text-sm text-muted-foreground">Choose a new password for your account.</p>
      <form class="mt-6 space-y-6" novalidate @submit.prevent="changePassword">
        <FieldGroup class="max-w-2xl gap-4">
          <Field :data-invalid="passwordFields.currentPassword.invalid.value">
            <FieldLabel for="current-password">Current password</FieldLabel>
            <Input
              id="current-password"
              v-model="passwordFields.currentPassword.formValue.value"
              type="password"
              autocomplete="current-password"
              :aria-invalid="passwordFields.currentPassword.invalid.value"
            />
            <FieldDescription v-if="passwordFields.currentPassword.error.value">{{ passwordFields.currentPassword.error.value }}</FieldDescription>
          </Field>
          <div class="grid gap-4 sm:grid-cols-2">
            <Field :data-invalid="passwordFields.newPassword.invalid.value">
              <FieldLabel for="new-password">New password</FieldLabel>
              <Input
                id="new-password"
                v-model="passwordFields.newPassword.formValue.value"
                type="password"
                autocomplete="new-password"
                :aria-invalid="passwordFields.newPassword.invalid.value"
              />
              <FieldDescription v-if="passwordFields.newPassword.error.value">{{ passwordFields.newPassword.error.value }}</FieldDescription>
            </Field>
            <Field :data-invalid="passwordFields.passwordConfirm.invalid.value">
              <FieldLabel for="confirm-password">Confirm new password</FieldLabel>
              <Input
                id="confirm-password"
                v-model="passwordFields.passwordConfirm.formValue.value"
                type="password"
                autocomplete="new-password"
                :aria-invalid="passwordFields.passwordConfirm.invalid.value"
              />
              <FieldDescription v-if="passwordFields.passwordConfirm.error.value">{{ passwordFields.passwordConfirm.error.value }}</FieldDescription>
            </Field>
          </div>
        </FieldGroup>

        <p v-if="passwordError" class="text-sm text-destructive" role="alert">{{ passwordError }}</p>
        <p v-if="passwordSuccess" class="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {{ passwordSuccess }}
        </p>
        <Button type="submit" :disabled="passwordSaving">
          {{ passwordSaving ? 'Updating…' : 'Update password' }}
        </Button>
      </form>
    </section>
  </div>
</template>
