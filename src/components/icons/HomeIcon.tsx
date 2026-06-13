import Svg, { Path } from "react-native-svg"
import type { IconProps } from "./types"

export function HomeIcon({ color = "#000", size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M2.5 10H4.16667V15.8333C4.16667 16.2754 4.34226 16.6993 4.65482 17.0118C4.96738 17.3244 5.39131 17.5 5.83333 17.5H14.1667C14.6087 17.5 15.0326 17.3244 15.3452 17.0118C15.6577 16.6993 15.8333 16.2754 15.8333 15.8333V10H17.5L10 2.5L2.5 10Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.5 17.5007V12.5007C7.5 12.0586 7.6756 11.6347 7.98816 11.3221C8.30072 11.0096 8.72464 10.834 9.16667 10.834H10.8333C11.2754 10.834 11.6993 11.0096 12.0118 11.3221C12.3244 11.6347 12.5 12.0586 12.5 12.5007V17.5007"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
