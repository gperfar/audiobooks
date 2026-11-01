// Publishing = adding the .cuento file to public/cuentos in the GitHub repo;
// the Pages workflow redeploys the site with it.
const githubRepository = import.meta.env.VITE_GITHUB_REPOSITORY

export const canOpenGithubUpload = Boolean(githubRepository)

export function getGithubUploadUrl() {
  return `https://github.com/${githubRepository}/upload/main/public/cuentos`
}
