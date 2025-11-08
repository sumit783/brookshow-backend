export const validatePhone = (phone) => {
    const clean = phone.replace(/\D/g, ""); // remove non-digits
    if (clean.length < 10) return null;
    return `+91${clean.slice(-10)}`; // default India
  };
  