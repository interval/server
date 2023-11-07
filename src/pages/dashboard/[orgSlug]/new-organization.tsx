import { Field, Form, Formik } from 'formik'
import { trpc, client, inferMutationInput } from '~/utils/trpc'
import IVInputField from '~/components/IVInputField'
import IVButton from '~/components/IVButton'
import PageHeading from '~/components/PageHeading'
import { isOrgSlugValid } from '~/utils/validate'

export default function NewOrganizationPage() {
  return (
    <div className="dashboard-container space-y-4">
      <PageHeading title="New organization" showBackButton />
      <NewOrganizationForm />
    </div>
  )
}

function NewOrganizationForm() {
  const createOrganization = trpc.useMutation('organization.create')

  return (
    <Formik<inferMutationInput<'organization.create'>>
      initialValues={{
        slug: '',
        name: '',
      }}
      isInitialValid={false}
      initialTouched={{}}
      onSubmit={async data => {
        if (createOrganization.isLoading) return

        createOrganization.mutate(data, {
          onSuccess(newOrg) {
            window.location.assign(
              `/dashboard/${
                newOrg.slug
              }?nc-new-organization=${encodeURIComponent(newOrg.name)}`
            )
          },
        })
      }}
    >
      {({ errors, touched, isValid }) => (
        <Form>
          <div className="max-w-lg space-y-4">
            <IVInputField id="name" label="Organization name">
              <Field
                id="name"
                name="name"
                type="text"
                className="form-input"
                placeholder="Name"
                disabled={createOrganization.isLoading}
                validate={(slug: string) => {
                  if (!slug) return 'Please enter a name.'
                }}
                required
              />
            </IVInputField>
          </div>
          <div className="max-w-lg space-y-4 pt-4">
            <IVInputField
              id="slug"
              label="Organization slug"
              errorMessage={
                errors.slug && touched.slug ? errors.slug : undefined
              }
              constraints="Must be at least 2 characters and can only contain lowercase letters, numbers, hyphens, and underscores."
            >
              <Field
                id="slug"
                name="slug"
                type="text"
                className="form-input"
                placeholder="Slug"
                aria-describedby="slug-constraints"
                disabled={createOrganization.isLoading}
                validate={async (slug: string) => {
                  if (!isOrgSlugValid(slug)) {
                    return 'Slugs must be at least 2 characters and can only contain lowercase letters, numbers, hyphens, and underscores.'
                  }

                  const canChange = await client.query(
                    'organization.is-slug-available',
                    {
                      slug,
                    }
                  )

                  if (!canChange) {
                    return 'Sorry, this slug is taken. Please select another.'
                  }
                }}
                required
              />
            </IVInputField>
          </div>
          <div className="inline-block pt-6">
            <IVButton
              disabled={createOrganization.isLoading || !isValid}
              type="submit"
              label="Create organization"
            />
          </div>
          {createOrganization.isError && (
            <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
              Sorry, there was a problem creating the organization.
            </div>
          )}
        </Form>
      )}
    </Formik>
  )
}
