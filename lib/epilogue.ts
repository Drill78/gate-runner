// The supplied MP3 contains 3,480 MPEG-2 Layer III audio frames at 24 kHz.
// HTML audio's ended event is authoritative; this encoded duration is the
// silent/error fallback (83.4666666667 s after LAME encoder delay and padding).
export const EPILOGUE_DURATION_SECONDS = 83.52;
export const EPILOGUE_WAVE_SPACING = 1.35;
export const EPILOGUE_EVENT_LIFETIME = 8;
export const EPILOGUE_BLESSINGS = ['恭喜', '谢谢'] as const;

export interface EpilogueBlessingEvent {
  id: number;
  time: number;
  // Normalized screen coordinates keep celebrations clear of the hero/controls.
  x: number;
  y: number;
  text: (typeof EPILOGUE_BLESSINGS)[number];
}
