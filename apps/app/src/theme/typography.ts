export const pretendardFamily = {
  100: 'Pretendard-100',
  200: 'Pretendard-200',
  300: 'Pretendard-300',
  400: 'Pretendard-400',
  500: 'Pretendard-500',
  600: 'Pretendard-600',
  700: 'Pretendard-700',
  800: 'Pretendard-800',
  900: 'Pretendard-900',
} as const;

export type PretendardWeight = keyof typeof pretendardFamily;

export function pretendard(weight: PretendardWeight = 400) {
  return { fontFamily: pretendardFamily[weight] } as const;
}
