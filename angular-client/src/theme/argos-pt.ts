/**
 * App-wide PrimeNG pass-through attributes.
 * PrimeIcons draw a private-use glyph in ::before, and Chrome adds it to the accessible name of the
 * button around it (" Add"), so icons next to a label are hidden from assistive tech.
 * Icon-only buttons still need their own ariaLabel.
 */
const ArgosPt = {
  button: { icon: { 'aria-hidden': 'true' } },
  togglebutton: { icon: { 'aria-hidden': 'true' } },
  menu: { itemIcon: { 'aria-hidden': 'true' } }
};

export default ArgosPt;
