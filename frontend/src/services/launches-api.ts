import type { ApiResult } from '../types/api.type'
import type { CreateLaunchDto, Launch, UpdateLaunchDto } from '../types/launch.type'
import { request } from './api-client'

/** JSON headers for write operations. */
const JSON_HEADERS = { 'Content-Type': 'application/json' }

/** `GET /api/launches` — list the whole launch program. */
export function listLaunches(): Promise<ApiResult<Launch[]>> {
  return request<Launch[]>('/launches')
}

/** `POST /api/launches` — schedule a launch, returns the created entity. */
export function createLaunch(dto: CreateLaunchDto): Promise<ApiResult<Launch>> {
  return request<Launch>('/launches', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(dto),
  })
}

/** `PUT /api/launches/:id` — update a launch, returns the updated entity. */
export function updateLaunch(
  id: string,
  dto: UpdateLaunchDto,
): Promise<ApiResult<Launch>> {
  return request<Launch>(`/launches/${id}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(dto),
  })
}

/** `DELETE /api/launches/:id` — cancel a launch (204 No Content on success). */
export function deleteLaunch(id: string): Promise<ApiResult<void>> {
  return request<void>(`/launches/${id}`, { method: 'DELETE' })
}
