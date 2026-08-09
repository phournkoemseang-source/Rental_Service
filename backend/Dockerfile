# Build context = the backend/ directory.
# On Render: Root Directory = "backend", Dockerfile Path = "Dockerfile".
# (In render.yaml that is: rootDir: backend, dockerfilePath: ./Dockerfile.)
# All COPY paths below are relative to backend/.
FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    git \
    zip \
    unzip \
    libzip-dev \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
# --no-scripts/--no-autoloader: artisan does not exist yet, so Laravel's
# post-autoload-dump script (php artisan package:discover) must not run here.
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction

COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction

RUN php artisan storage:link

RUN chown -R www-data:www-data storage bootstrap/cache
USER www-data

EXPOSE 10000
CMD ["sh", "-c", "php artisan migrate --force --no-interaction && exec php artisan serve --host=0.0.0.0 --port=$PORT"]
