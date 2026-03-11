import { toast } from "sonner";

export function notifySuccess(message: string) {
  return toast.success(message);
}

export function notifyError(message: string) {
  return toast.error(message);
}

export function notifyInfo(message: string) {
  return toast.info(message);
}

export function notifyLoading(message: string) {
  return toast.loading(message);
}

export function dismissNotification(id?: string | number) {
  return toast.dismiss(id);
}
