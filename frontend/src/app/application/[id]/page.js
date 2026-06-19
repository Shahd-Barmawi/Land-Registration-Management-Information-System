import { redirect } from 'next/navigation'
export default function ApplicationRedirect({ params }) {
  redirect(`/applicant/application/${params.id}`)
}
