from sys import argv
from coloraide import Color
from pyperclip import copy

print(argv)

name = argv[1]
hex1 = argv[2]
hex2 = argv[3]

color1 = Color(hex1).convert('oklch')
color2 = Color(hex2).convert('oklch')

l1, c1, h1 = color1.coords()
l2, c2, h2 = color2.coords()

l_delta = l2 - l1
c_delta = c2 - c1
h_delta = h2 - h1

match l_delta:
    case n if n > 0:
        # positive number
        l_string = f"calc(l + {l_delta:.3f})"
    case n if n < 0:
        # negative number
        l_string = f"calc(l - {l_delta * -1:.3f})"
    case _:
        # is zero
        l_string = f"l"

match c_delta:
    case n if n > 0:
        # positive number
        c_string = f"calc(c + {c_delta:.3f})"
    case n if n < 0:
        # negative number
        c_string = f"calc(c - {c_delta * -1:.3f})"
    case _:
        # is zero
        c_string = f"c"

match h_delta:
    case n if n > 0:
        # positive number
        h_string = f"calc(h + {h_delta:.3f})"
    case n if n < 0:
        # negative number
        h_string = f"calc(h - {h_delta * -1:.3f})"
    case _:
        # is zero
        h_string = f"h"

final_string = f"oklch(from var(--{name}) {l_string} {c_string} {h_string})"
copy(final_string)
print(final_string)