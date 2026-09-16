// Django REST Framework's two standard error response shapes, factored out of ~/utilities/reef
// because they're DRF's convention rather than anything Reef's own spec declares — reef_api.yaml
// describes what a successful response carries, not how DRF phrases a failure.

import { z } from 'zod'

// DRF's shape for a non-field error: authentication failures, permission denials, throttling, a
// 404 from a router that found no matching view. The one field callers read out of a body they
// otherwise treat as opaque.
export const DjangoErrorDetailSchema = z.object({ detail: z.string() })

// DRF's shape for a serializer validation error: one array of messages per rejected field, e.g.
// `{title: ["This field may not be blank."]}`. Preferred over a generic message wherever it's
// present, since it names the problem far better than anything the caller could invent.
export const DjangoFieldErrorsSchema = z.record(z.string(), z.array(z.string()).nonempty())
