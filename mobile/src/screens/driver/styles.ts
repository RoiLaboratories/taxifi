import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#111827',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeContainer: {
    width: '100%',
  },
  welcomeMessage: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  welcomeSubtitle: {
    color: '#10B981',
    fontSize: 16,
    marginTop: 4,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 8,
  },
  logoutButton: {
    padding: 8,
  },
  earningsCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  earningsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.8,
  },
  earningsAmount: {
    color: '#10B981',
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  earningsDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  earningsPeriod: {
    flex: 1,
  },
  periodLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.6,
  },
  periodAmount: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.6,
  },
  activeRideButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  activeRideContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeRideLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeRideInfo: {
    marginLeft: 12,
  },
  activeRideTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeRideSubtitle: {
    color: '#D1FAE5',
    fontSize: 14,
    marginTop: 2,
  },
  noRideButton: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  noRideText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#1F2937',
  },
  disabledText: {
    color: '#6B7280',
  },
});
