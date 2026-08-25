/**
 * Next.js exécute `register()` une seule fois au **démarrage du serveur**.
 * On y déclenche la validation des variables d'environnement (import de `./env`),
 * pour que le conteneur échoue tout de suite avec un message clair si une
 * variable requise manque — plutôt qu'à la première requête (AC #3, Story 1.2).
 */
export async function register() {
  await import('./env')
}
