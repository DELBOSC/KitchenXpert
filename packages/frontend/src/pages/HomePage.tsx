import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function HomePage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
          KitchenXpert
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          {t('home.tagline')}
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/designer"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            {t('home.startDesign')}
          </Link>
          <Link
            to="/catalog"
            className="px-8 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg font-semibold hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-gray-700 transition-colors"
          >
            {t('home.exploreCatalog')}
          </Link>
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          {t('home.features')}
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            title={t('home.feature3dTitle')}
            description={t('home.feature3dDesc')}
            icon="🎨"
          />
          <FeatureCard
            title={t('home.featureAiTitle')}
            description={t('home.featureAiDesc')}
            icon="🤖"
          />
          <FeatureCard
            title={t('home.featureCatalogTitle')}
            description={t('home.featureCatalogDesc')}
            icon="📚"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} KitchenXpert. {t('common.allRightsReserved')}</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}): React.ReactElement {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}
