interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

const S = ({ size = 24, color = "currentColor", ...props }: IconProps & React.SVGProps<SVGSVGElement>) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props} />
);

export const Aries = (p: IconProps) => <S {...p}><path d="M12 3C9 3 6 6 6 10c0 3 2 5 4 6m2-14c3 0 6 3 6 7 0 3-2 5-4 6" /><path d="M12 3v18" /></S>;
export const Taurus = (p: IconProps) => <S {...p}><circle cx="12" cy="8" r="4" /><path d="M5 4c0 0 2 4 7 4s7-4 7-4" /><path d="M8 14l-3 7M16 14l3 7" /></S>;
export const Gemini = (p: IconProps) => <S {...p}><path d="M8 4h8M8 20h8" /><path d="M12 4v16" /><circle cx="8" cy="8" r="2" /><circle cx="16" cy="16" r="2" /></S>;
export const Cancer = (p: IconProps) => <S {...p}><circle cx="9" cy="10" r="4" /><circle cx="15" cy="14" r="4" /><path d="M5 10h2M17 14h2" /><path d="M12 7v2M12 15v2" /></S>;
export const Leo = (p: IconProps) => <S {...p}><circle cx="10" cy="10" r="4" /><path d="M14 10c2 0 4 1 5 3s0 5-2 6" /><path d="M6 14c-2 1-3 3-2 5" /><path d="M10 14v7" /></S>;
export const Virgo = (p: IconProps) => <S {...p}><path d="M7 4v16M7 4c3 0 4 3 4 5s-1 4-4 5c3 0 4 3 4 5s-1 5-4 6" /><path d="M14 4v16M14 4c2 0 3 2 3 4s-1 3-3 4" /><path d="M20 4v16" /></S>;
export const Libra = (p: IconProps) => <S {...p}><path d="M12 4v2" /><path d="M4 8h16" /><circle cx="8" cy="14" r="4" /><circle cx="16" cy="14" r="4" /><path d="M4 18h16" /></S>;
export const Scorpio = (p: IconProps) => <S {...p}><path d="M7 4v16M7 4c3 0 4 3 4 5s-1 4-4 5c3 0 4 3 4 5" /><path d="M14 4v8c0 2 2 3 3 3s3-1 3-3" /><path d="M20 12l1 2-2 1" /><path d="M14 16v4" /></S>;
export const Sagittarius = (p: IconProps) => <S {...p}><path d="M5 19L19 5" /><path d="M14 5h5v5" /><path d="M9 5l-4 4" /><path d="M5 15l4-4" /></S>;
export const Capricorn = (p: IconProps) => <S {...p}><path d="M6 4c0 4 3 6 6 6s6-2 6-6" /><path d="M12 10c-4 0-6 3-6 6 0 2 1 4 3 4" /><path d="M12 10l4 6c1 1 2 2 2 4" /></S>;
export const Aquarius = (p: IconProps) => <S {...p}><path d="M4 8h4l2-2 2 2h4l2-2 2 2" /><path d="M4 14h4l2-2 2 2h4l2-2 2 2" /></S>;
export const Pisces = (p: IconProps) => <S {...p}><ellipse cx="9" cy="12" rx="4" ry="7" transform="rotate(-20 9 12)" /><ellipse cx="15" cy="12" rx="4" ry="7" transform="rotate(20 15 12)" /><path d="M3 12h18" /></S>;

export const zodiacIcons: Record<string, React.ComponentType<IconProps>> = {
  aries: Aries, taurus: Taurus, gemini: Gemini, cancer: Cancer,
  leo: Leo, virgo: Virgo, libra: Libra, scorpio: Scorpio,
  sagittarius: Sagittarius, capricorn: Capricorn, aquarius: Aquarius, pisces: Pisces,
};

export const zodiacSymbols: Record<string, string> = {
  aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋",
  leo: "♌", virgo: "♍", libra: "♎", scorpio: "♏",
  sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓",
};
