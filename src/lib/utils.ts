import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte segundos em formato legível (ex: "2d 5h", "15m", "8 dias")
 * @param seconds - Número total de segundos
 * @returns String formatada com a duração
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (days < 7) {
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  
  if (weeks < 4) {
    return remainingDays > 0 ? `${weeks}sem ${remainingDays}d` : `${weeks}sem`;
  }
  
  const months = Math.floor(days / 30);
  return `${months}mes`;
}
