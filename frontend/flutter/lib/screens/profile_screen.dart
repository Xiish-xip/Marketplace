import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          if (auth.isLoggedIn)
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: () {
                auth.signOut();
                Navigator.pushReplacementNamed(context, '/login');
              },
            ),
        ],
      ),
      body: auth.isLoggedIn
          ? ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const SizedBox(height: 24),
                CircleAvatar(
                  radius: 48,
                  backgroundColor: Theme.of(
                    context,
                  ).colorScheme.primaryContainer,
                  child: Text(
                    (auth.userProfile?['displayName'] as String? ??
                            auth.user?.email ??
                            'U')
                        .substring(0, 1)
                        .toUpperCase(),
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onPrimaryContainer,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  auth.userProfile?['displayName'] as String? ??
                      auth.user?.displayName ??
                      'User',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  auth.user?.email ?? '',
                  textAlign: TextAlign.center,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: Colors.grey),
                ),
                const SizedBox(height: 8),
                Chip(
                  label: Text(
                    (auth.userProfile?['role'] as String? ?? 'customer')
                        .toUpperCase(),
                  ),
                  backgroundColor: Theme.of(
                    context,
                  ).colorScheme.secondaryContainer,
                ),
                const SizedBox(height: 32),
                if (auth.isAdmin)
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.admin_panel_settings),
                      title: const Text('Admin Dashboard'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.pushNamed(context, '/admin'),
                    ),
                  ),
                if (auth.isSeller)
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.inventory),
                      title: const Text('My Products'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.pushNamed(
                        context,
                        '/products',
                        arguments: {'sellerId': auth.user!.uid},
                      ),
                    ),
                  ),
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.receipt_long),
                    title: const Text('My Orders'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Orders coming soon!')),
                    ),
                  ),
                ),
              ],
            )
          : Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Sign in to view your profile'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => Navigator.pushNamed(context, '/login'),
                    child: const Text('Sign In'),
                  ),
                ],
              ),
            ),
    );
  }
}
