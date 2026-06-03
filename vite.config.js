import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 최소 진단용 설정. 일부러 깨끗하게 둡니다.
// 만약 여기서 Tone 워클릿 에러가 난다면, 아래 optimizeDeps 주석을 풀어 테스트합니다.
export default defineConfig({
  plugins: [react()],
  // optimizeDeps: {
  //   exclude: ['tone'],
  // },
})
