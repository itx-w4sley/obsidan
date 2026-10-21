/**
 * Edit this file to change the DEFAULT identity and login copy.
 * Workspace -> Settings can override the editable identity in MongoDB.
 * Don't put passwords, access codes, or MongoDB credentials here: this is public browser code.
 */
export const STUDIO = {
  brand: 'Obsidian Customs',
  product: 'Studio Pro',
  loginEyebrow: 'YOUR PERSONAL CREATIVE WORKSPACE',
  loginTitle: 'Good ideas.',
  loginHighlight: 'Great execution.',
  loginDescription: 'Projects, tasks and your server identity.',
  loginSubdescription: 'One code opens your whole studio.',
  secureCaption: 'Secured by Techura AuthO2',
  footer: 'OBSIDIAN CUSTOMS',
  userSubtitle: 'Personal workspace',
  defaultPreferences: {
    workspaceName: 'Obsidian Studio Pro',
    userName: 'Joshua Wasley',
    tagline: 'Your personal creative workspace',
    accent: '#BBA6FF'
  }
};

export function getAccentStyle(preferences) {
  return {'--purple': preferences?.accent || STUDIO.defaultPreferences.accent};
}

export function initials(name) {
  return (name || 'Studio Owner').trim().split(/\s+/).slice(0,2).map(word => word[0]).join('').toUpperCase();
}
