<script setup lang="ts">
import EmptyState from '../components/EmptyState.vue'
</script>

<template>
  <section aria-labelledby="customer-h">
    <h1 id="customer-h">Customer</h1>
    <p>Launch catalog and seat bookings arrive in an upcoming stage.</p>
    <EmptyState message="No launches available to book yet." />
  </section>
</template>
